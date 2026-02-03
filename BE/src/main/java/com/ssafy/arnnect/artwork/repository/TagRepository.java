package com.ssafy.arnnect.artwork.repository;

import com.ssafy.arnnect.artwork.domain.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findAllByNameIn(List<String> names);
}
